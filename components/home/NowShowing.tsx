"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { scrollToEl, scrollToY } from "@/lib/smooth-scroll";
import { useUi } from "@/lib/store";
import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

interface Props {
  movies: Movie[];
  onPlayTrailer: (m: Movie, el: HTMLElement) => void;
  /** cards already shown by the §8.3 scroll story (its headline + first row); 0 = a normal section */
  skip?: number;
}

/**
 * Now Showing in Theaters (CLAUDE.md §8.5). With the scroll story (§8.3) the headline and the first row of
 * 4 cards live in the pinned hall, and this section continues under them with "Show all (N)". Without it
 * (reduced motion) it is a normal section: centred title + the first row.
 * "Show all" expands in place (a 500ms clip reveal, new cards fade up 60ms apart); "Show less" collapses and
 * brings the first row back into view. The reveal animates clip-path, not height.
 */
export function NowShowing({ movies, onPlayTrailer, skip = 0 }: Props) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const inStory = skip > 0;
  const list = movies.slice(skip);
  const firstRow = inStory ? 0 : 4; // cards visible before "Show all" in this section
  const [expanded, setExpanded] = useState(false); // what the user asked for (drives the clip)
  const [open, setOpen] = useState(false); // layout height: full while expanded or still closing
  const [heights, setHeights] = useState<{ row: number; all: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasMore = list.length > firstRow;
  const diff = heights ? heights.all - heights.row : 0;
  // the clip only transitions after the first measurement has painted (no wipe on page load)
  const [clipLive, setClipLive] = useState(false);
  useEffect(() => {
    if (!heights || clipLive) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setClipLive(true)));
    return () => cancelAnimationFrame(id);
  }, [heights, clipLive]);

  /** back to the first row: the end of the scroll story, or this section's title */
  const backToTop = () => {
    if (inStory) scrollToY(useUi.getState().storyEnd, !reduced);
    else if (titleRef.current) scrollToEl(titleRef.current, -128, !reduced);
  };

  /** after "Show less" has wiped closed: drop the height, then bring the first row back into view */
  const onClipEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "clip-path" || expanded) return;
    setOpen(false);
    window.setTimeout(backToTop, 60); // after the height change has laid out
  };

  // measure the first row and the full grid (re-measured on resize)
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const measure = () => {
      const first = el.querySelector<HTMLElement>("[data-card-slug]");
      if (!first) return;
      setHeights({ row: firstRow ? first.offsetHeight : 0, all: el.scrollHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [list.length, firstRow]);

  const toggle = () => {
    if (expanded) {
      setExpanded(false); // clip closes; the height snaps back and the first row comes back into view
      if (reduced) {
        setOpen(false);
        backToTop();
      }
    } else {
      setOpen(true);
      setExpanded(true);
    }
  };

  const collapsedHeight = firstRow && heights ? heights.row + 32 : 0;

  return (
    <section
      id="now-showing"
      aria-labelledby="now-showing-title"
      className={`relative z-10 scroll-mt-24 bg-night [overflow-anchor:none] ${inStory ? "pt-10 pb-24" : "pt-[120px] pb-24"}`}
    >
      <div className="mx-auto max-w-[1280px] px-8">
        {!inStory && (
          <h2 id="now-showing-title" ref={titleRef} className="display-m mb-14 scroll-mt-32 text-center text-white">
            {t("home.nowShowingTitle")}
          </h2>
        )}

        {/* clip to the first row until expanded; the lift on hover needs a little room around the cards */}
        <div
          className="-mx-4 -mt-4 overflow-hidden px-4 pt-4"
          style={{ height: heights ? (open || !hasMore ? heights.all + 32 : collapsedHeight) : firstRow ? "auto" : 0 }}
        >
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
            {list.map((m, i) => {
              const extra = i >= firstRow;
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
                    delay: extra ? (expanded ? (i - firstRow) * 0.06 + 0.1 : 0) : i * 0.08,
                  }}
                >
                  <MovieCard movie={m} variant="now" onPlayTrailer={onPlayTrailer} inert={extra && !expanded} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {hasMore && (
          <div className={`flex justify-center ${inStory && !open ? "" : "mt-8"}`}>
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
