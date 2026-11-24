"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { branches } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/store";
import { STORY } from "@/lib/story";
import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

/**
 * §8.3 DOM layers of the "Into the hall" scroll story, over the 3D hall. Everything reads the --p custom
 * property (0..1) set on the pinned section, so scrolling only changes transforms and opacity.
 * Beat 2: the facts row · Beat 3: the headline block · Beat 4: the first 4 Now Showing cards rise.
 */
export function StoryOverlay({ movies, onPlayTrailer }: { movies: Movie[]; onPlayTrailer: (m: Movie, el: HTMLElement) => void }) {
  const { t } = useT();
  const live = useUi((s) => s.heroScroll > STORY.head[0]); // headline + cards reachable by keyboard only once shown
  const facts = [
    t("story.fact1", { count: branches.length }),
    t("story.fact2"),
    t("story.fact3"),
    t("story.fact4"),
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {/* calm floor under the cards */}
      <div aria-hidden className="story-shade absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-night via-night/75 to-transparent" />

      {/* beat 2: the facts row */}
      <ol aria-hidden className="story-facts absolute inset-x-0 bottom-10 mx-auto grid max-w-[1440px] grid-cols-4 gap-8 px-8">
        {facts.map((f, i) => (
          <li key={i} className="flex items-baseline gap-3 border-t border-white/10 pt-4 text-[14px] text-white/70">
            <span className="font-mono text-[13px] text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            {f}
          </li>
        ))}
      </ol>

      {/* beat 3: the headline block, top-left */}
      <div className="absolute inset-x-0 top-[max(112px,13vh)] mx-auto max-w-[1440px] px-8">
        <div className="story-head max-w-[760px]" inert={!live || undefined}>
          <h2 id="now-showing-title" className="display-m mb-4 text-white">
            {t("story.headline")}
          </h2>
          <p className="body-l mb-5 max-w-[520px] text-white/70">{t("story.line")}</p>
          <Link href="/book" className="focus-ring pointer-events-auto inline-flex items-center gap-2 text-[15px] font-semibold text-white transition-colors hover:text-purple-light">
            {t("story.schedule")}
            <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      </div>

      {/* beat 4: the first row of Now Showing rises from the floor */}
      <div
        className="story-cards absolute bottom-[max(32px,4vh)] left-1/2 grid -translate-x-1/2 grid-cols-4 gap-6"
        style={{ width: "calc(4 * min(302px, 36vh) + 72px)" }}
        inert={!live || undefined}
      >
        {movies.slice(0, 4).map((m, i) => (
          <div
            key={m.slug}
            className="story-card pointer-events-auto"
            style={{ ["--s" as string]: STORY.cards + i * STORY.cardStep, ["--d" as string]: 0.18 + (i % 2) * 0.04 }}
          >
            <MovieCard movie={m} variant="now" onPlayTrailer={onPlayTrailer} priority={i < 2} />
          </div>
        ))}
      </div>
    </div>
  );
}
