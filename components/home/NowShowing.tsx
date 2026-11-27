"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useT } from "@/lib/i18n";
import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";
import { RevealText } from "@/components/ui/RevealText";

/**
 * Now Showing in Theaters (CLAUDE.md §8.5): centred title and every film in a grid (2 per row on phones, 4 from
 * 768px). Designer, Nov 27: all films are shown at once on every screen; the "Show all" button was removed.
 * Cards rise in after the title (designer reference: Aave), row by row.
 * 375–575px (designer, Nov 27): one horizontally scrollable row; each card carries its tags + a play button on the
 * poster and the title, genres and language · runtime below it (MovieCard `strip`).
 */
export function NowShowing({ movies, onPlayTrailer }: { movies: Movie[]; onPlayTrailer: (m: Movie, el: HTMLElement) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();

  return (
    <section id="now-showing" aria-labelledby="now-showing-title" className="theme-light relative z-10 scroll-mt-24 overflow-x-clip pt-[100px] max-md:pt-[60px] [overflow-anchor:none]">
      <div className="mx-auto max-w-[1280px] px-8">
        <h2 id="now-showing-title" className="display-m mb-14 max-[821px]:mb-8 scroll-mt-32 text-center text-ink">
          <RevealText text={t("home.nowShowingTitle")} />
        </h2>

        <div id="now-showing-grid" className="grid grid-cols-2 gap-6 pb-4 md:grid-cols-4">
          {movies.map((m, i) => (
            <motion.div
              key={m.slug}
              initial={{ opacity: 0, y: reduced ? 0 : 56, scale: reduced ? 1 : 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 + (i % 4) * 0.09 }}
            >
              <MovieCard movie={m} variant="now" onPlayTrailer={onPlayTrailer} strip />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
