"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

const FIRST_ROW = 4;

/**
 * Now Showing in Theaters (CLAUDE.md §8.5): centred title, a 4-per-row grid showing the first row,
 * "Show all (N)" expands in place (height 500ms, new cards fade up 60ms apart), "Show less" collapses
 * and brings the title back into view.
 */
export function NowShowing({ movies, onPlayTrailer }: { movies: Movie[]; onPlayTrailer: (m: Movie, el: HTMLElement) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<{ row: number; all: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasMore = movies.length > FIRST_ROW;

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
      setExpanded(false);
      titleRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    } else setExpanded(true);
  };

  return (
    <section id="now-showing" aria-labelledby="now-showing-title" className="relative z-10 scroll-mt-24 bg-night pt-[120px] pb-24">
      <div className="mx-auto max-w-[1280px] px-8">
        <h2 id="now-showing-title" ref={titleRef} className="display-m mb-14 scroll-mt-32 text-center text-white">
          {t("home.nowShowingTitle")}
        </h2>

        {/* clip to the first row until expanded; the lift on hover needs a little room around the cards */}
        <motion.div
          className="-mx-4 -mt-4 overflow-hidden px-4 pt-4"
          initial={false}
          animate={{ height: heights ? (expanded || !hasMore ? heights.all : heights.row) + 32 : "auto" }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.65, 0, 0.35, 1] }}
        >
          <div ref={grid} id="now-showing-grid" className="grid grid-cols-2 gap-6 pb-4 md:grid-cols-4">
            {movies.map((m, i) => {
              const extra = i >= FIRST_ROW;
              return (
                <motion.div
                  key={m.slug}
                  initial={{ opacity: 0, y: reduced ? 0 : 24 }}
                  whileInView={extra ? undefined : { opacity: 1, y: 0 }}
                  animate={extra ? (expanded ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 24 }) : undefined}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: extra ? (expanded ? (i - FIRST_ROW) * 0.06 + 0.1 : 0) : i * 0.08,
                  }}
                >
                  <MovieCard movie={m} variant="now" onPlayTrailer={onPlayTrailer} inert={extra && !expanded} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={toggle} className="btn btn-secondary btn-sm" aria-expanded={expanded} aria-controls="now-showing-grid">
              {expanded ? t("common.showLess") : t("common.showAll", { count: movies.length })}
              <Icon name={expanded ? "altArrowUp" : "chevronDown"} size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
