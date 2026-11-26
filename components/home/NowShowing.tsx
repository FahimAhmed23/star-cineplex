"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";
import { RevealText } from "@/components/ui/RevealText";

const FIRST_ROW = 4;

/**
 * Now Showing in Theaters (CLAUDE.md §8.5): centred title, a 4-per-row grid showing the first row,
 * "Show all (N)" expands in place (a 500ms clip reveal, new cards fade up 60ms apart), "Show less" collapses
 * and brings the title back into view. The reveal animates clip-path, not height: the box takes its new
 * height in one step and the clip wipes open / closed, so nothing re-lays out on every frame.
 */
export function NowShowing({ movies, onPlayTrailer }: { movies: Movie[]; onPlayTrailer: (m: Movie, el: HTMLElement) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false); // what the user asked for (drives the clip)
  const [open, setOpen] = useState(false); // layout height: full while expanded or still closing
  const [heights, setHeights] = useState<{ row: number; all: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasMore = movies.length > FIRST_ROW;
  const diff = heights ? heights.all - heights.row : 0;
  // the clip only transitions after the first measurement has painted (no wipe on page load)
  const [clipLive, setClipLive] = useState(false);
  useEffect(() => {
    if (!heights || clipLive) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setClipLive(true)));
    return () => cancelAnimationFrame(id);
  }, [heights, clipLive]);

  /** after "Show less" has wiped closed: drop the height, then bring the title back into view */
  const onClipEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "clip-path" || expanded) return;
    setOpen(false);
    // after the height change has laid out (a smooth scroll started in the same frame gets cancelled)
    window.setTimeout(() => titleRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }), 60);
  };

  // measure the first row and the full grid (re-measured on resize)
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const measure = () => {
      const first = el.querySelector<HTMLElement>("[data-card-slug]");
      if (!first) return;
      setHeights({ row: first.offsetHeight, all: el.scrollHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [movies.length]);

  const toggle = () => {
    if (expanded) {
      setExpanded(false); // clip closes; the height snaps back and the title scrolls into view when it is done
      if (reduced) {
        setOpen(false);
        titleRef.current?.scrollIntoView({ block: "start" });
      }
    } else {
      setOpen(true);
      setExpanded(true);
    }
  };

  return (
    <section id="now-showing" aria-labelledby="now-showing-title" className="theme-light relative z-10 scroll-mt-24 pt-[100px] [overflow-anchor:none]">
      <div className="mx-auto max-w-[1280px] px-8">
        <h2 id="now-showing-title" ref={titleRef} className="display-m mb-14 scroll-mt-32 text-center text-ink">
          <RevealText text={t("home.nowShowingTitle")} />
        </h2>

        {/* clip to the first row until expanded; the lift on hover needs a little room around the cards */}
        <div
          className="-mx-4 -mt-4 overflow-hidden px-4 pt-4"
          style={{ height: heights ? (open || !hasMore ? heights.all : heights.row) + 32 : "auto" }}
        >
          {/* the grid keeps its full height; the clip hides everything below the first row until expanded
              (negative side insets leave room for the hover lift) */}
          <div
            ref={grid}
            id="now-showing-grid"
            className="grid grid-cols-2 gap-6 pb-4 md:grid-cols-4"
            style={{
              clipPath: `inset(-16px -16px ${hasMore && !expanded ? diff : -16}px -16px)`,
              transition: clipLive && !reduced ? "clip-path 500ms var(--ease-in-out)" : "none",
            }}
            onTransitionEnd={onClipEnd}
          >
            {movies.map((m, i) => {
              const extra = i >= FIRST_ROW;
              return (
                <motion.div
                  key={m.slug}
                  // first row: rises in after the title (designer reference: Aave); "Show all" rows: a quicker fade up
                  initial={{ opacity: 0, y: reduced ? 0 : extra ? 24 : 56, scale: reduced || extra ? 1 : 0.97 }}
                  whileInView={extra ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  animate={extra ? (expanded ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 24 }) : undefined}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    duration: extra ? 0.6 : 1,
                    ease: [0.22, 1, 0.36, 1],
                    delay: extra ? (expanded ? (i - FIRST_ROW) * 0.06 + 0.1 : 0) : 0.25 + i * 0.09,
                  }}
                >
                  <MovieCard movie={m} variant="now" onPlayTrailer={onPlayTrailer} inert={extra && !expanded} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={toggle} className="btn btn-secondary btn-secondary-light btn-sm" aria-expanded={expanded} aria-controls="now-showing-grid">
              {expanded ? t("common.showLess") : t("common.showAll", { count: movies.length })}
              <Icon name={expanded ? "altArrowUp" : "chevronDown"} size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
